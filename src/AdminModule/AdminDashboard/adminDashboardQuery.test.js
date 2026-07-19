import {
	ADMIN_DASHBOARD_DAYS,
	ADMIN_DASHBOARD_TABS,
	buildAdminDashboardSearch,
	readAdminDashboardQuery,
} from "./adminDashboardQuery";

test("dashboard query defaults to reservations today and produces a shareable URL", () => {
	const query = readAdminDashboardQuery("");
	expect(query.tab).toBe(ADMIN_DASHBOARD_TABS.RESERVATIONS);
	expect(query.day).toBe(ADMIN_DASHBOARD_DAYS.TODAY);
	expect(query.canonicalSearch).toContain("tab=reservations-summary");
	expect(query.canonicalSearch).toContain("day=today");
});

test("dashboard query safely normalizes invalid values without discarding other params", () => {
	const query = readAdminDashboardQuery("?tab=bad&day=bad&ref=shared");
	expect(query.tab).toBe(ADMIN_DASHBOARD_TABS.RESERVATIONS);
	expect(query.day).toBe(ADMIN_DASHBOARD_DAYS.TODAY);
	expect(query.canonicalSearch).toContain("ref=shared");
});

test("dashboard query updates tabs and filters while preserving the other selection", () => {
	const hotels = buildAdminDashboardSearch("?tab=reservations-summary&day=tomorrow", {
		tab: ADMIN_DASHBOARD_TABS.HOTELS,
	});
	expect(hotels).toContain("tab=overall-hotels-summary");
	expect(hotels).toContain("day=tomorrow");

	const yesterday = buildAdminDashboardSearch(hotels, {
		day: ADMIN_DASHBOARD_DAYS.YESTERDAY,
	});
	expect(yesterday).toContain("tab=overall-hotels-summary");
	expect(yesterday).toContain("day=yesterday");
});

test("dashboard query preserves only valid reservation detail identifiers", () => {
	const reservationId = "507f1f77bcf86cd799439011";
	const withDetails = buildAdminDashboardSearch("?day=today", { reservationId });
	expect(readAdminDashboardQuery(withDetails).reservationId).toBe(reservationId);

	const withoutDetails = buildAdminDashboardSearch(withDetails, { reservationId: "" });
	expect(withoutDetails).not.toContain("reservationId");
	expect(readAdminDashboardQuery("?reservationId=not-an-id").reservationId).toBe("");
});
