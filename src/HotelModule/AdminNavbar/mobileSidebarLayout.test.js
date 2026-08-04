import {
	HOTEL_MOBILE_MENU_BREAKPOINT,
	HOTEL_MOBILE_CONTENT_GRID_CSS,
	HOTEL_MOBILE_MENU_RAIL_WIDTH_PX,
	HOTEL_PHONE_MENU_BREAKPOINT,
  HOTEL_PHONE_MENU_CLEARANCE_PX,
  HOTEL_PHONE_MENU_TOGGLE_GAP_PX,
  HOTEL_PHONE_MENU_TOGGLE_INSET_PX,
  HOTEL_PHONE_MENU_TOGGLE_WIDTH_PX,
  HOTEL_TOP_NAVBAR_HEIGHT_PX,
  hotelMobileMenuInlineSide,
  hotelPhoneHeaderPadding,
  isHotelMobileMenuViewport,
} from "./mobileSidebarLayout";

test("hotel shell constants match the fixed navbar and drawer breakpoint", () => {
  expect(HOTEL_TOP_NAVBAR_HEIGHT_PX).toBe(70);
	expect(HOTEL_MOBILE_MENU_BREAKPOINT).toBe(1200);
	expect(HOTEL_MOBILE_MENU_RAIL_WIDTH_PX).toBe(80);
});

test("hotel and overall mobile menus share the same breakpoint", () => {
  expect(isHotelMobileMenuViewport(320)).toBe(true);
  expect(isHotelMobileMenuViewport(375)).toBe(true);
  expect(isHotelMobileMenuViewport(412)).toBe(true);
  expect(isHotelMobileMenuViewport(HOTEL_MOBILE_MENU_BREAKPOINT)).toBe(true);
  expect(isHotelMobileMenuViewport(HOTEL_MOBILE_MENU_BREAKPOINT + 1)).toBe(
    false,
  );
});

test("phone header clearance protects the toggle in LTR and RTL", () => {
  expect(HOTEL_PHONE_MENU_CLEARANCE_PX).toBe(
    HOTEL_PHONE_MENU_TOGGLE_INSET_PX +
      HOTEL_PHONE_MENU_TOGGLE_WIDTH_PX +
      HOTEL_PHONE_MENU_TOGGLE_GAP_PX,
  );
  expect(hotelMobileMenuInlineSide("ltr")).toBe("left");
  expect(hotelMobileMenuInlineSide("rtl")).toBe("right");
  expect(hotelPhoneHeaderPadding(false)).toBe("0 10px 0 62px");
  expect(hotelPhoneHeaderPadding(true)).toBe("0 62px 0 10px");
});

test("mobile content grid collapses to one full-width, shrink-safe column", () => {
  expect(HOTEL_MOBILE_CONTENT_GRID_CSS).toContain(
    `@media (max-width: ${HOTEL_MOBILE_MENU_BREAKPOINT}px)`,
  );
  expect(HOTEL_MOBILE_CONTENT_GRID_CSS).toContain(
    "grid-template-columns: minmax(0, 1fr)",
  );
  expect(HOTEL_MOBILE_CONTENT_GRID_CSS).toContain("grid-column: 1 / -1");
  expect(HOTEL_MOBILE_CONTENT_GRID_CSS).toContain("min-width: 0");
	expect(HOTEL_MOBILE_CONTENT_GRID_CSS).toContain("width: 100%");
	expect(HOTEL_MOBILE_CONTENT_GRID_CSS).toContain(
		`padding-inline-start: ${HOTEL_MOBILE_MENU_RAIL_WIDTH_PX}px`,
	);
	expect(HOTEL_MOBILE_CONTENT_GRID_CSS).toContain(
		`@media (max-width: ${HOTEL_PHONE_MENU_BREAKPOINT}px)`,
	);
});
