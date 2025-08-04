/** @format */

import React, { useContext, useReducer } from "react";
import reducer from "./cart_reducer";
import { LANGUAGE_TOGGLE } from "./actions";

const getLanguageLocalStorage = () => {
	let language = localStorage.getItem("lang");
	if (language) {
		return JSON.parse(localStorage.getItem("lang"));
	} else {
		return "English";
	}
};

const initialState = {
	isSidebarOpen: false,
	chosenLanguage: getLanguageLocalStorage(),
};

const CartContext = React.createContext();

export const CartProvider = ({ children }) => {
	const [state, dispatch] = useReducer(reducer, initialState);

	const languageToggle = (passedLanguage) => {
		dispatch({ type: LANGUAGE_TOGGLE, payload: passedLanguage });
	};

	return (
		<CartContext.Provider
			value={{
				...state,
				languageToggle,
			}}
		>
			{children}
		</CartContext.Provider>
	);
};
// make sure use
export const useCartContext = () => {
	return useContext(CartContext);
};
