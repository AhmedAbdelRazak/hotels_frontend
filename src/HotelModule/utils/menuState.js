export const MENU_COLLAPSE_KEY = "hotelAdminMenuCollapsed";

export const getStoredMenuCollapsed = () => {
	if (typeof window === "undefined") {
		return { value: false, hasStored: false };
	}
	const stored = localStorage.getItem(MENU_COLLAPSE_KEY);
	return { value: stored === "true", hasStored: stored !== null };
};
