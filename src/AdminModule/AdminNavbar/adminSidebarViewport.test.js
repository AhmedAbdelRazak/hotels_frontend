import {
	adminSidebarRootWidth,
	isAdminMobileViewport,
	shouldCloseAdminSidebarForViewport,
} from "./adminSidebarViewport";

test("admin sidebar reserves desktop width and no grid width on mobile", () => {
	expect(adminSidebarRootWidth(1440, false)).toBe("285px");
	expect(adminSidebarRootWidth(1440, true)).toBe("70px");
	expect(adminSidebarRootWidth(390, false)).toBe("0px");
	expect(isAdminMobileViewport(992)).toBe(true);
	expect(isAdminMobileViewport(993)).toBe(false);
});

test("mobile entry closes the drawer once without fighting a deliberate reopen", () => {
	expect(shouldCloseAdminSidebarForViewport(null, true)).toBe(true);
	expect(shouldCloseAdminSidebarForViewport(false, true)).toBe(true);
	expect(shouldCloseAdminSidebarForViewport(true, true)).toBe(false);
	expect(shouldCloseAdminSidebarForViewport(true, false)).toBe(false);
});
