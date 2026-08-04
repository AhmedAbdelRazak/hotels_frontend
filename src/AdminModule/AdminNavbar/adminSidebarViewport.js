export const ADMIN_MOBILE_BREAKPOINT = 992;
export const ADMIN_PHONE_BREAKPOINT = 768;
export const ADMIN_STACKED_TOPBAR_HEIGHT_PX = 181;
export const ADMIN_MOBILE_MENU_BUTTON_HEIGHT_PX = 42;
export const ADMIN_MOBILE_MENU_INSET_PX = 12;
export const ADMIN_MOBILE_MENU_GAP_PX = 12;
export const ADMIN_MOBILE_MENU_CLEARANCE_PX =
	ADMIN_MOBILE_MENU_INSET_PX +
	ADMIN_MOBILE_MENU_BUTTON_HEIGHT_PX +
	ADMIN_MOBILE_MENU_GAP_PX;

export const isAdminMobileViewport = (width) => Number(width) <= ADMIN_MOBILE_BREAKPOINT;

export const adminSidebarRootWidth = (width, collapsed) =>
	isAdminMobileViewport(width) ? "0px" : collapsed ? "70px" : "285px";

export const shouldCloseAdminSidebarForViewport = (previousMobileMode, currentMobileMode) =>
	currentMobileMode && previousMobileMode !== true;

export const adminMobileMenuInlineSide = (direction) =>
	String(direction || "ltr").toLowerCase() === "rtl" ? "right" : "left";
