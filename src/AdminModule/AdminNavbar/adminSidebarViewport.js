export const ADMIN_MOBILE_BREAKPOINT = 992;

export const isAdminMobileViewport = (width) => Number(width) <= ADMIN_MOBILE_BREAKPOINT;

export const adminSidebarRootWidth = (width, collapsed) =>
	isAdminMobileViewport(width) ? "0px" : collapsed ? "70px" : "285px";

export const shouldCloseAdminSidebarForViewport = (previousMobileMode, currentMobileMode) =>
	currentMobileMode && previousMobileMode !== true;
