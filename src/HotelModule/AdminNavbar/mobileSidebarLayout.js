export const HOTEL_MOBILE_MENU_BREAKPOINT = 1200;
export const HOTEL_PHONE_MENU_BREAKPOINT = 560;
export const HOTEL_TOP_NAVBAR_HEIGHT_PX = 70;
export const HOTEL_MOBILE_MENU_RAIL_WIDTH_PX = 80;
export const HOTEL_PHONE_MENU_TOGGLE_INSET_PX = 8;
export const HOTEL_PHONE_MENU_TOGGLE_WIDTH_PX = 44;
export const HOTEL_PHONE_MENU_TOGGLE_GAP_PX = 10;
export const HOTEL_PHONE_MENU_CLEARANCE_PX =
  HOTEL_PHONE_MENU_TOGGLE_INSET_PX +
  HOTEL_PHONE_MENU_TOGGLE_WIDTH_PX +
  HOTEL_PHONE_MENU_TOGGLE_GAP_PX;

export const isHotelMobileMenuViewport = (width) =>
  Number(width) <= HOTEL_MOBILE_MENU_BREAKPOINT;

export const hotelMobileMenuInlineSide = (direction) =>
  String(direction || "ltr").toLowerCase() === "rtl" ? "right" : "left";

export const hotelPhoneHeaderPadding = (isArabic) =>
  isArabic
    ? `0 ${HOTEL_PHONE_MENU_CLEARANCE_PX}px 0 10px`
    : `0 10px 0 ${HOTEL_PHONE_MENU_CLEARANCE_PX}px`;

export const HOTEL_MOBILE_CONTENT_GRID_CSS = `
	@media (max-width: ${HOTEL_MOBILE_MENU_BREAKPOINT}px) {
		.grid-container-main {
			grid-template-columns: minmax(0, 1fr);
			min-width: 0;
			width: 100%;
		}

		.navcontent {
			min-width: 0;
		}

		.otherContentWrapper {
			grid-column: 1 / -1;
			min-width: 0;
			width: 100%;
			padding-inline-start: ${HOTEL_MOBILE_MENU_RAIL_WIDTH_PX}px;
		}
	}

	@media (max-width: ${HOTEL_PHONE_MENU_BREAKPOINT}px) {
		.otherContentWrapper {
			padding-inline-start: 0;
			padding-inline-end: 0;
		}
	}
`;
