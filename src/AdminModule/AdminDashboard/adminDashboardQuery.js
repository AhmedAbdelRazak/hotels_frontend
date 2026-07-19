export const ADMIN_DASHBOARD_TABS = Object.freeze({
	RESERVATIONS: "reservations-summary",
	HOTELS: "overall-hotels-summary",
});

export const ADMIN_DASHBOARD_DAYS = Object.freeze({
	TODAY: "today",
	YESTERDAY: "yesterday",
	TOMORROW: "tomorrow",
});

const validTabs = new Set(Object.values(ADMIN_DASHBOARD_TABS));
const validDays = new Set(Object.values(ADMIN_DASHBOARD_DAYS));

const normalizeTab = (value) => (validTabs.has(value) ? value : ADMIN_DASHBOARD_TABS.RESERVATIONS);

const normalizeDay = (value) => (validDays.has(value) ? value : ADMIN_DASHBOARD_DAYS.TODAY);

const withQuestionMark = (params) => {
	const query = params.toString();
	return query ? `?${query}` : "";
};

export const readAdminDashboardQuery = (search = "") => {
	const params = new URLSearchParams(search || "");
	const tab = normalizeTab(params.get("tab"));
	const day = normalizeDay(params.get("day"));
	params.set("tab", tab);
	params.set("day", day);

	return {
		tab,
		day,
		canonicalSearch: withQuestionMark(params),
	};
};

export const buildAdminDashboardSearch = (search = "", updates = {}) => {
	const current = readAdminDashboardQuery(search);
	const params = new URLSearchParams(current.canonicalSearch);

	if (Object.prototype.hasOwnProperty.call(updates, "tab")) {
		params.set("tab", normalizeTab(updates.tab));
	}
	if (Object.prototype.hasOwnProperty.call(updates, "day")) {
		params.set("day", normalizeDay(updates.day));
	}

	return withQuestionMark(params);
};
