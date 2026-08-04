import {
	ADMIN_MOBILE_MENU_BUTTON_HEIGHT_PX,
	ADMIN_MOBILE_MENU_CLEARANCE_PX,
	ADMIN_MOBILE_MENU_GAP_PX,
	ADMIN_MOBILE_MENU_INSET_PX,
	ADMIN_PHONE_BREAKPOINT,
	ADMIN_STACKED_TOPBAR_HEIGHT_PX,
	adminMobileMenuInlineSide,
	adminSidebarRootWidth,
	isAdminMobileViewport,
	shouldCloseAdminSidebarForViewport,
} from "./adminSidebarViewport";

test("admin sidebar reserves desktop width and no grid width on mobile", () => {
	expect(adminSidebarRootWidth(1440, false)).toBe("285px");
	expect(adminSidebarRootWidth(1440, true)).toBe("70px");
	expect(adminSidebarRootWidth(320, false)).toBe("0px");
	expect(adminSidebarRootWidth(375, false)).toBe("0px");
	expect(adminSidebarRootWidth(412, false)).toBe("0px");
	expect(isAdminMobileViewport(992)).toBe(true);
	expect(isAdminMobileViewport(993)).toBe(false);
	expect(ADMIN_PHONE_BREAKPOINT).toBe(768);
	expect(ADMIN_STACKED_TOPBAR_HEIGHT_PX).toBe(181);
});

test("mobile entry closes the drawer once without fighting a deliberate reopen", () => {
	expect(shouldCloseAdminSidebarForViewport(null, true)).toBe(true);
	expect(shouldCloseAdminSidebarForViewport(false, true)).toBe(true);
	expect(shouldCloseAdminSidebarForViewport(true, true)).toBe(false);
	expect(shouldCloseAdminSidebarForViewport(true, false)).toBe(false);
});

test("mobile menu clearance and inline side are deterministic in both directions", () => {
	expect(ADMIN_MOBILE_MENU_CLEARANCE_PX).toBe(
		ADMIN_MOBILE_MENU_INSET_PX +
			ADMIN_MOBILE_MENU_BUTTON_HEIGHT_PX +
			ADMIN_MOBILE_MENU_GAP_PX,
	);
	expect(adminMobileMenuInlineSide("ltr")).toBe("left");
	expect(adminMobileMenuInlineSide("rtl")).toBe("right");
});
